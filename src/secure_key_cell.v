timescale 1ns / 1ps

module secure_key_cell (
    input wire clk, // System clock
    input wire rst_n, // Active-low master reset
    input wire tamper_line_n, // Active-low physical tamper loop (0 = Breach detected!)
    input wire key_data_in, // Data bit to store in the secure cell
    input wire write_enable, // Control signal to allow writing a key
    output reg secure_key_out // The locked cryptographic key bit output
);

    // Hardware State Machine / Interlock Logic
    always @(posedge clk or negedge rst_n or negedge tamper_line_n) begin
        if (!rst_n) begin
            // Safe initial state on hardware boot
            secure_key_out <= 1'b0;
        end 
        else if (!tamper_line_n) begin
            // CRITICAL FAILSAFE: If the tamper wire is cut or drops to 0V, 
            // instantly zero out the key in silicon, ignoring all other inputs.
            secure_key_out <= 1'b0;
        end 
        else begin
            // Normal operation: Write data only if safely armed and enabled
            if (write_enable) begin
                secure_key_out <= key_data_in;
            end
        end
    end

endmodule